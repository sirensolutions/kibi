import React from 'react';
import { decorators } from 'react-treebeard';
import { Treebeard } from 'react-treebeard';
import theme from './datasource_tree_theme';

const customDecorators = {
  Loading: decorators.Loading,
  Container: decorators.Container,
  Toggle: decorators.Toggle,
  Header: ({ node, style }) => {
    let icon;
    if (node.type === 'datasource') {
      icon = 'database';
    } else if (node.children) {
      icon = 'database';
    } else {
      icon = 'table';
    }
    const iconClass = `fa fa-${icon}`;
    const iconStyle = {
      marginRight: '5px'
    };

    let displayName = node.name;
    if (displayName === '') {
      displayName = 'Default';
    }

    return (
      <div style={style.base}>
        <div style={style.title}>
          <i className={iconClass} style={iconStyle}/> {displayName}
        </div>
      </div>
    );
  }
};

export default class DatasourceTree extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.onToggle = this.onToggle.bind(this);
  }

  onToggle(node, toggled) {
    if (this.state.cursor) {
      this.state.cursor.active = false;
    }

    if (node.toggleFunction) {
      node.toggleFunction(node);
    }

    node.active = true;
    if (!node.loaded && node.childrenFunction) {
      node.loading = true;
      node.childrenFunction(node)
      .then(children => {
        node.children = children;
        node.loaded = true;
        node.loading = false;
      })
      .catch(() => {
        node.loading = true;
        node.toggled = false;
      });
    } else {
      node.loading = false;
    }
    if (node.children) {
      node.toggled = toggled;
    }
    this.setState({ cursor: node });
  }

  render() {
    return (
      <Treebeard
        data={this.props.data}
        decorators={customDecorators}
        style={theme}
        onToggle={this.onToggle}
      />
    );
  }
}

DatasourceTree.propTypes = {
  data: React.PropTypes.oneOfType([
    React.PropTypes.object,
    React.PropTypes.array
  ]).isRequired,
  onToggle: React.PropTypes.object
};
