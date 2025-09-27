
export class BinaryParser {
    hexValues: string[] = [];
    charValues: string[] = [];

    constructor(buffer: ArrayBuffer) {
        const view = new Uint8Array(buffer);
        if (view.length % 2 !== 0) {
            console.warn("view length is not even!!!")
        }

        for (let i=0; i < view.length; i++) {
            const byte = view[i]
            // console.log(byte)

            this.hexValues.push(byte.toString(16).padStart(2, '0'));

            this.charValues.push(String.fromCharCode(byte));
        }
    }
}