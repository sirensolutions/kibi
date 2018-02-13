import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
// kibi: if messageAsHtml is true, then bind message as html
export function KuiModalBodyText({ className, children, messageAsHtml, ...rest }) {
  const classes = classnames('kuiModalBodyText', className);
  if (messageAsHtml) {
    return (
      <div className={ classes } { ...rest } dangerouslySetInnerHTML={{ __html: children }}>
      </div>
    );
  } else {
    return (
      <div className={ classes } { ...rest }>
        { children }
      </div>
    );
  }
}
// kibi: end
KuiModalBodyText.propTypes = {
  className: PropTypes.string,
  children: PropTypes.node
};
