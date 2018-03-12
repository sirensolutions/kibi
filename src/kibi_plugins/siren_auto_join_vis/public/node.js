import _ from 'lodash';

class Node {

  constructor(options) {
    this.type = options.type;
    this.id = options.id;
    this.label = options.label;
    this.button = options.button;
    this.parent = options.parent;
    this.visible = options.visible;
    this._showChildren = options.showChildren;
    this._useAltNodes = options._useAltNodes;

    this.nodes = [];
    this.altNodes = [];
    this.useAltNodes = false;
  }

  set showChildren(value) {
    this._showChildren = value;

    // compute visibility of children nodes
    _.each(this.nodes, node => {
      node.visible = value;
    });
    _.each(this.altNodes, node => {
      node.visible = value;
    });
  }

  get showChildren() {
    return this._showChildren;
  }

  set useAltNodes(value) {
    this._useAltNodes = value;
  }

  get useAltNodes() {
    return this._useAltNodes;
  }

  addNode(node) {
    node.parent = this;
    this.nodes.push(node);
  }

  addAltNode(node) {
    node.parent = this;
    this.altNodes.push(node);
  }

  findNode(id) {
    return _.find(this.nodes, 'id', id);
  }

  findAltNode(id) {
    return _.find(this.altNodes, 'id', id);
  }

  closeOpenSiblings() {
    _.each(this.parent.altNodes, sibling => {
      if (sibling.id !== this.id) {
        sibling.showChildren = false;
      }
    });
    _.each(this.parent.nodes, sibling => {
      if (sibling.id !== this.id) {
        sibling.showChildren = false;
      }
    });
  }
}

export default Node;
