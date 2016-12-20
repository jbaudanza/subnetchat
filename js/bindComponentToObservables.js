import React from 'react'

export default function bindComponentToObservables(Component, observables) {
  return class ReactObserver extends React.Component {
    constructor(props) {
      super(props);
      this.state = {};
    }

    componentWillMount() {
      this.unsubs = [];
      Object.keys(observables).forEach((key) => {
        this.unsubs.push(
          observables[key].subscribe((v) => this.setState({[key]: v}))
        );
      });

    }

    componentWillUnmount() {
      this.unsubs.forEach(function(sub) {
        sub.unsubscribe();
      })
    }

    render() {
      return <Component {...this.state} {...this.props} />;
    }
  }
}
