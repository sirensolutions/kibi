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

export function onDashboardPage() {
  return onActivePage('kibana:dashboard');
}

export function onVisualizePage() {
  return onActivePage('kibana:visualize');
}

export function onManagementPage() {
  return onActivePage('kibana:management');
}
