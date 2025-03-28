import React from 'react';
import { Button, Result } from 'antd';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log error to your error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // Clear any cached state that might have caused the error
    localStorage.removeItem('TIMER_STORAGE_KEY');
    localStorage.removeItem('OPTIONS_STORAGE_KEY');
    localStorage.removeItem('QUESTION_INDEX_KEY');
    localStorage.removeItem('VIEW_STATE_KEY');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="error"
          title="Something went wrong"
          subTitle={this.state.error?.message || "An error occurred while rendering this component"}
          extra={[
            <Button type="primary" key="reload" onClick={this.handleReset}>
              Try Again
            </Button>
          ]}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;