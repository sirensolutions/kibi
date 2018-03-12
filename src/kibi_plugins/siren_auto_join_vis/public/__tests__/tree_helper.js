import expect from 'expect.js';

import treeHelper from '../tree_helper';
import Node from '../node';
import TreeType from '../tree_type';

describe('Tree helper', function () {

  describe('transformNodesIntoAltNodes', function () {

    it('should correctly add alternative nodes based on nodes', function () {


      // from
      // {
      //   type: VIRTUAL_BUTTON,
      //   nodes: [
      //     {
      //       type: RELATION
      //       label: 'rel'
      //       nodes: [
      //         {
      //           type: BUTTON
      //           button: {
      //             label: 'dash1'
      //           }
      //         },
      //         {
      //           type: BUTTON
      //           button: {
      //             label: 'dash2'
      //           }
      //         }
      //       ]
      //     }
      //   ]
      // }
      // to
      // {
      //   type: VIRTUAL_BUTTON,
      //   altNodes: [
      //     {
      //       type: DASHBOARD,
      //       label: 'dash1',
      //       nodes: [
      //         {
      //           type: BUTTON
      //           button: {
      //             label: 'rel'
      //           }
      //         },
      //       ]
      //     },
      //     {
      //       type: DASHBOARD,
      //       label: 'dash2',
      //       nodes: [
      //         {
      //           type: BUTTON
      //           button: {
      //             label: 'rel'
      //           }
      //         },
      //       ]
      //     }
      //   ]
      // }

      const dash1 = new Node({
        type: TreeType.BUTTON,
        button: {
          label: 'dash1'
        }
      });
      const dash2 = new Node({
        type: TreeType.BUTTON,
        button: {
          label: 'dash2'
        }
      });

      const relNode = new Node({
        type: TreeType.RELATION,
        label: 'rel'
      });
      relNode.addNode(dash1);
      relNode.addNode(dash2);

      const virtButtonNode = new Node({
        type: TreeType.VIRTUAL_BUTTON
      });
      virtButtonNode.addNode(relNode);

      treeHelper.transformNodesIntoAltNodes(virtButtonNode);

      expect(virtButtonNode.altNodes.length).to.equal(2);

      const firstDashNode = virtButtonNode.altNodes[0];
      expect(firstDashNode.type).to.equal(TreeType.DASHBOARD);
      expect(firstDashNode.label).to.equal('dash1');
      expect(firstDashNode.nodes.length).to.equal(1);
      expect(firstDashNode.nodes[0].type).to.equal(TreeType.BUTTON);
      expect(firstDashNode.nodes[0].button.label).to.equal('rel {0}');
      expect(firstDashNode.nodes[0].nodes.length).to.equal(0);
      expect(firstDashNode.nodes[0].altNodes.length).to.equal(0);


      const secondDashNode = virtButtonNode.altNodes[1];
      expect(secondDashNode.type).to.equal(TreeType.DASHBOARD);
      expect(secondDashNode.label).to.equal('dash2');
      expect(secondDashNode.nodes.length).to.equal(1);
      expect(secondDashNode.nodes[0].type).to.equal(TreeType.BUTTON);
      expect(secondDashNode.nodes[0].button.label).to.equal('rel {0}');
      expect(secondDashNode.nodes[0].nodes.length).to.equal(0);
      expect(secondDashNode.nodes[0].altNodes.length).to.equal(0);
    });
  });
});
