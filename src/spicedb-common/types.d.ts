declare module '*.yaml' {
    const data: any
    export default data
}

declare module '*.md' {
    const data: any
    export default data
}

declare global {
    interface Window { Go: any; }
}
