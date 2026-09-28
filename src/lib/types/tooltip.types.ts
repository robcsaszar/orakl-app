export enum Position {
  TOP = "top",
  BOTTOM = "bottom",
  LEFT = "left",
  RIGHT = "right",
}

export interface TooltipOptions {
  position?: Position;
  showArrow?: boolean;
  timeout?: number;
}

export interface TooltipState {
  isVisible: boolean;
  content: string;
  targetElement: HTMLElement | null;
  targetRect: DOMRect | null;
  position: Position;
  showArrow: boolean;
  top: number;
  left: number;
  arrowOffset: number;
}

export interface TooltipDimensions {
  width: number;
  height: number;
  offset: number;
}

export interface TooltipShowDetail {
  target: HTMLElement;
  content: string;
  position?: Position;
  showArrow?: boolean;
  timeout?: number;
}
