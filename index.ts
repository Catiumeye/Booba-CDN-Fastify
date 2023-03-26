import fastify, { FastifyError } from 'fastify';
import fp from 'fastify-plugin';
import dotenv from 'dotenv';
import bucketCfg from './buckets.json'
import { genStr, prepareBuckets, Tbuckets } from './src/fi4a-worker';
import path from 'path';
import contentDisposition from 'content-disposition';
import mime from 'mime';
import fs from 'fs';
import { pipeline } from 'stream/promises'
import { errorHandler, HttpException } from './src/error-worker';
import { brotliCompress, createBrotliCompress, createBrotliDecompress } from 'zlib';
dotenv.config();

const buckets = Object.keys(bucketCfg).join('|');
const app = fastify();

app.register(fp(errorHandler))
app.get<{
    Params: {
        bucket: string;
        file: string;
    }
}>(`/:bucket(${buckets})/:file(.+)`, (request, reply) => {
    try {
        const { bucket, file } = request.params;
        const filePath = path.join(process.cwd(), 'static', bucket, file)
    
        const existsFile = fs.existsSync(filePath);
        if(!existsFile) {
            throw new HttpException('file not exists', 400);
        }
        const dispositionType = request.headers['content-disposition']?.includes('attachment') ?
            'attachment' : 'inline';
    
        const stat = fs.statSync(filePath)
        
        const readStream = fs.createReadStream(filePath);
        
        reply.raw.writeHead(200, {
            'Content-Disposition': contentDisposition(file, {type: dispositionType}),
            'Content-Length': stat.size,
            'Content-Type': mime.getType(filePath)
        })
        
        readStream.on('error', (err) => {
            reply.code(500).send({ error: err })
        })
    
        // readStream.pipe(createBrotliDecompress()).pipe(reply.raw);
        readStream.pipe(reply.raw)
    } catch (error) {
        reply.status(500).send({ok: false, message: 'General Error'})
    }
})

app.post<{
    Params: {
        bucket: string;
    }
}>(`/:bucket(${buckets})/`, (request, reply) => {
    try {
        const { bucket } = request.params;
        const bucketPath = path.join(process.cwd(), 'static', bucket)
        const ext = mime.getExtension(request.headers['content-type']);
        const name = `${genStr()}.${ext}`;
        const LIMIT = bucketCfg[bucket].limit;
    
        if (+request.headers['content-length']/1024/1024 > LIMIT) {
            throw new Error('exceeded the limit')
        }
    
        let SIZE = 0;
        const wsFile = fs.createWriteStream(path.join(bucketPath, name))

        // request.raw.pipe(createBrotliCompress()).on('data', (chunk) => {
        //     SIZE += chunk.length;
        //     if(SIZE/1024/1024 > LIMIT) {
        //         request.raw.emit('error')
        //     }
        //     wsFile.write(chunk);
        // })

        request.raw.on('data', (chunk) => {
            SIZE += chunk.length;
            if(SIZE/1024/1024 > LIMIT) {
                request.raw.emit('error')
            }
            wsFile.write(chunk);
        })
    
        request.raw.on('error', (chunk) => {
            try {
                fs.unlinkSync(path.join(bucketPath, name));
            } catch {}
            reply
                .code(500)
                .send({ok: false, message: 'exceeded the limit'})
        })
    
        request.raw.on('end', (chunk) => {
            SIZE += chunk?.length || 0;
            if(SIZE/1024/1024 > LIMIT) {
                request.raw.emit('error')
            }
            reply.send({ok: true, bucket: bucket, file_id: name})
        })
    } catch (error) {
        reply.status(500).send({ok: false, message: 'General Error'})
    }
}).addContentTypeParser('*', {}, (req, body, done) => {
    done(null, body)
})

app.delete<{
    Params: {
        bucket: string;
        file: string;
    }
}>(`/:bucket(${buckets})/:file(.+)`, function (request, reply) {
    try {
        const { bucket, file } = request.params;
        const filePath = path.join(process.cwd(), 'static', bucket, file)
        const existsFile = fs.existsSync(filePath);
        if(!existsFile) {
            throw new HttpException('file not exists', 400)
        }
        fs.unlinkSync(filePath);
    
        reply.send({ok: true, bucket: bucket, file_id: file})
    } catch (error) {
        reply.status(500).send({ok: false, message: 'General Error'})
    }
})


prepareBuckets(bucketCfg as Tbuckets)
app.listen({
    port: +process.env.PORT || 9000,
}, (err, address) => {
    console.log(err, address);
})