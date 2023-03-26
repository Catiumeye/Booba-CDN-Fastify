import fs from "fs"
import path from "path"

export type Tbuckets = {
    [key: string]: {
        "limit": number,
        "get": string,
        "create": string,
        "delete": string 
    }
}

export const prepareBuckets = (buckets: Tbuckets): void => {
    const rootStaticPath = (folder: string = '') => path.join(process.cwd(), 'static', folder)
    const parentStaticFolder = fs.existsSync(rootStaticPath());

    if (!parentStaticFolder) {
        fs.mkdirSync(rootStaticPath())
    }

    for (const bucket in buckets) {
        const bucketFolder = fs.existsSync(rootStaticPath(bucket))
        if (!bucketFolder) fs.mkdirSync(rootStaticPath(bucket))
    } 
}

export const genStr = (length: number = 36): string => {
    const salt = 'abcdefghijklmnopqrstyvwxyz0123456789';
    let resultName: string = '';

    for (let i = 0; i < length; i++) {
        const isUpper = !!Math.round(Math.random());
        const randomI = Math.round(Math.random() * (salt.length - 1) + 0);
        const randomSymbol = salt[randomI];
        const isInt = Number.isInteger(randomSymbol);
        
        resultName += isInt ?
            randomSymbol :
            isUpper ? randomSymbol.toUpperCase() : randomSymbol;
    }
    return resultName;
}