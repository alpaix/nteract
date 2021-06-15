import Immutable from "immutable";
import React from "react";
import { connect } from "react-redux";

import { AppState, ContentRef, selectors } from "@nteract/core";
import { Output } from "@nteract/outputs";

const AUTO_SCROLL_HEIGHT_THRESHOLD = 1800;

type ScrolledValue = boolean | "auto";

interface ComponentProps {
  id: string;
  contentRef: ContentRef;
  children: React.ReactNode;
}

interface StateProps {
  hidden: boolean;
  scrolledValue: ScrolledValue;
  outputs: Immutable.List<any>;
}

type Props = ComponentProps & StateProps;

interface State {
  scrolledValueForAutoScroll: boolean;
}

export class Outputs extends React.PureComponent<Props, State> {
  private readonly wrapperRef: React.RefObject<HTMLDivElement>;

  constructor(props: Props) {
    super(props);
    this.state = { scrolledValueForAutoScroll: false };
    this.wrapperRef = React.createRef();
  }

  render() {
    const { outputs, children, hidden, scrolledValue } = this.props;
    const computedScrolledValue: boolean = scrolledValue == "auto" ? this.state.scrolledValueForAutoScroll : scrolledValue;
    const expanded = !computedScrolledValue;
    return (
      <div
        className={`nteract-cell-outputs ${hidden ? "hidden" : ""} ${
          expanded ? "expanded" : ""
        }`}
        ref={this.wrapperRef}
      >
        {outputs.map((output, index) => (
          <Output output={output} key={index}>
            {children}
          </Output>
        ))}
      </div>
    );
  }

  componentDidMount() {
    this.updateScrolledValueForAutoScroll();
  }

  componentDidUpdate(prevProps: Props, prevState: State) {
    this.updateScrolledValueForAutoScroll();
  }

  updateScrolledValueForAutoScroll() {
    if (this.props.scrolledValue !== "auto") {
      return;
    }
    const wrapperDiv = this.wrapperRef.current;
    if (!wrapperDiv) {
      return;
    }
    // Using scrollHeight instead of offsetHeight to avoid adding another wrapper div.
    // "scrollHeight is a measurement of the height of an element's content, including content not visible on the screen due to overflow"
    const heightOfOutputs = wrapperDiv.scrollHeight;
    const shouldScroll = this.autoScrollShouldScroll(heightOfOutputs);
    if (shouldScroll !== this.state.scrolledValueForAutoScroll) {
      this.setState({ scrolledValueForAutoScroll: shouldScroll })
    }
  }

  autoScrollShouldScroll(heightOfOutputs: number) {
    return heightOfOutputs >= AUTO_SCROLL_HEIGHT_THRESHOLD;
  }
}

export const makeMapStateToProps = (
  initialState: AppState,
  ownProps: ComponentProps
): ((state: AppState) => StateProps) => {
  const mapStateToProps = (state: AppState): StateProps => {
    let outputs = Immutable.List();
    let hidden = false;
    let scrolledValue: ScrolledValue = "auto";

    const { contentRef, id } = ownProps;
    const model = selectors.model(state, { contentRef });

    if (model && model.type === "notebook") {
      const cell = selectors.notebook.cellById(model, { id });
      if (cell) {
        outputs = cell.get("outputs", Immutable.List());
        hidden =
          cell.cell_type === "code" &&
          cell.getIn(["metadata", "jupyter", "outputs_hidden"]);
        if (cell.cell_type === "code") {
          const rawScrolledValue = cell.getIn(["metadata", "scrolled"]);
          if (rawScrolledValue === true || rawScrolledValue === false) {
            scrolledValue = rawScrolledValue;
          } else {
            scrolledValue = "auto";
          }
        }
      }
    }

    return { outputs, hidden, scrolledValue };
  };
  return mapStateToProps;
};

export default connect<StateProps, void, ComponentProps, AppState>(
  makeMapStateToProps
)(Outputs);
