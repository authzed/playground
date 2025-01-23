// NOTE: the bare export here makes the typescript compiler aware
// of the global type declarations.
export {}

declare module '*.yaml' {
    const data: object
    export default data
}

declare module '*.md' {
    const data: object
    export default data
}

declare module 'string.prototype.replaceall' {
    const fn: (value: string, find: string, replace: string) => string
    export default fn
}

declare module 'visjs-network' {
    const data: object
    export default data
}

declare global {
    interface Window {
        // TODO: type this based on what's in wasm_exec.js
        Go: new () => {
            importObject: WebAssembly.Imports;
            run: (instance: object) => void;
        };
        Crate: new (options: Options) => Crate;
    }
}
