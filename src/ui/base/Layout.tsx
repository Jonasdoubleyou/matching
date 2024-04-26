import "./Layout.css";

export function Row({ children, grow }: React.PropsWithChildren<{ grow?: true }>) {
    return <div className="row" style={{ flexGrow: grow ? 1 : undefined }}>
        {children}
    </div>
}

export function Column({ children, grow }: React.PropsWithChildren<{ grow?: true }>) {
    return <div className="column" style={{ flexGrow: grow ? 1 : undefined }}>
        {children}
    </div>
}

export function Spacer() {
    return <div className="spacer" />
}