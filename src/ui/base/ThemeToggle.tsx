import { IconButton } from "./Icons";

export function ThemeToggle() {
    function toggleColor() {
        const root = document.body;
        if (root.classList.contains("dark-mode")) {
            root.classList.remove("dark-mode");
        } else {
            root.classList.add("dark-mode");
        }
    }
    return <IconButton style={{ position: "fixed", left: 0, bottom: 0 }} icon='play_arrow' text="Switch color" onClick={toggleColor} />
}
