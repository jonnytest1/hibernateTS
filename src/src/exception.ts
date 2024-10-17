export class Exception extends Error {


    constructor(message: string, error: Error) {
        super(message);

        this.stack += "\nCaused-By:\n" + error.stack?.split("\n").map(line => `\t${line}`).join("\n")
    }

}