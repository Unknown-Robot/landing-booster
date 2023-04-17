import sharp from "sharp";

const transformSharp = (source, path) => {
    return new Promise((resolve, reject) => {
        sharp(source).webp({ quality: 100 }).toFile(path, (error) => {
            if(error) return reject(error);
            resolve(true);
        });
    });
}

export default transformSharp;