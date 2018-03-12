import _ from 'lodash';
import Leaf from './node';
import TreeType from './tree_type';


// NOTE: all functions which manipulate the tree nodes should be moved into this class
class TreeHelper {

  addAlternativeNodesToTree(tree, btnCountEnabled) {
    _.each(tree.nodes, node => {
      if (node.type === TreeType.VIRTUAL_BUTTON && node.nodes) {

        _.each(node.nodes, relNode => {
          // create dashboard nodes
          _.each(relNode.nodes, buttonNode => {
            const dashNodeId = 'tree-dashboard-' + buttonNode.button.label;
            let dashNode = node.findAltNode(dashNodeId);
            if (!dashNode) {
              dashNode = new Leaf({
                type: TreeType.DASHBOARD,
                id: dashNodeId,
                label: buttonNode.button.label.replace('{0}', ''),
                showChildren: false,
                visible: false,
                useAltNodes: false,
              });
              node.addAltNode(dashNode);
            }
          });
        });

        // once all dashboard nodes are in populate them with relation based buttons
        _.each(node.nodes, relNode => {
          _.each(relNode.nodes, relButtonNode => {
            const dashNodeId = 'tree-dashboard-' + relButtonNode.button.label;
            const altSubButton = _.cloneDeep(relButtonNode.button);
            altSubButton.label = relNode.label + ' {0}';
            if (btnCountEnabled) {
              altSubButton.showSpinner = true;
            }
            // now add it to the right place
            const dashNode = node.findAltNode(dashNodeId);
            const dashButtonNode = new Leaf({
              type: TreeType.BUTTON,
              label: relNode.label ,
              id: altSubButton.id,
              showChildren: false,
              visible: false,
              useAltNodes: false,
              button: altSubButton
            });
            dashNode.addNode(dashButtonNode);
          });
        });
      }
    });
  }
}

export default new TreeHelper();
