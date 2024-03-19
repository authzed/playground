declare module '*.yaml' {
    const data: any
    export default data
}

declare module '*.md' {
    const data: any
    export default data
}

declare module 'string.prototype.replaceall' {
    const fn: (value: string, find: string, replace: string) => string
    export default fn
}

declare module 'visjs-network' {
    const data: any
    export default data
}
