import chrome from 'ui/chrome';

function activePage() {
  return chrome.getNavLinks().find(link => link.active);
}

function onActivePage(pageId) {
  const page = activePage();

  if (!page) {
    return false;
  }
  return page.id === pageId;
}

function onDashboardPage() {
  return onActivePage('kibana:dashboard');
}

function onVisualizePage() {
  return onActivePage('kibana:visualize');
}

function onManagementPage() {
  return onActivePage('kibana:management');
}

export {
  onManagementPage,
  onVisualizePage,
  onDashboardPage
};
