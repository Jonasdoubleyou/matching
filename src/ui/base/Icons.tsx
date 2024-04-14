
import * as React from "react";
import "./Icons.css";

// c.f. https://fonts.google.com/icons (thanks Googol!)
export type IconName = 
  | 'play_arrow'
  | 'add'
  | 'cancel'
  | 'save'
  | 'menu'
  | 'settings'
  | 'print'
  | 'arrow_back'
  | 'arrow_forward'
  | 'pause';

export type IconProps = {
    icon: IconName;
};

export function Icon ({ icon }: IconProps) {
    return (
        <span className="icon material-symbols-outlined">
            {icon}
        </span>
    );
}

export function IconButton({ text, onClick, small, highlight, disabled, ...iconProps }: { icon: IconName, text?: string, small?: true, highlight?: true, disabled?: boolean, onClick?: () => void } & IconProps) {
    return (
        <button disabled={disabled} className={"icon-button no-print " + (small ? "icon-button_small" : "") + (highlight ? "icon-button_highlight" : "")} onClick={onClick}>
            <Icon {...iconProps} />
            {text && <div className="icon-button-text">{text}</div>}
        </button>
    )
}
