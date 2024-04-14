import "./Layout.css";

export function Row({ children }: React.PropsWithChildren<{}>) {
    return <div className="row">
        {children}
    </div>
}

export function Column({ children }: React.PropsWithChildren<{}>) {
    return <div className="column">
        {children}
    </div>
}

export function Spacer() {
    return <div className="spacer" />
}