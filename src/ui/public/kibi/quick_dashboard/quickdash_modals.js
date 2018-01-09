import createTemplate from './create_modal.html';
import titleConflictTemplate from './title_conflict_modal.html';
import progressTemplate from './progress_modal.html';

import './create_modal.less';

import { BaseModalProvider } from './base_modal';


export function QuickDashModalsProvider(Private) {
  const baseModal = Private(BaseModalProvider);

  return {
    create({ title, savedSearch }) {
      return baseModal(createTemplate, {
        result: {
          title,
          savedSearchAction: 'new',
          storeTimeWithDashboard: true
        },

        currentSavedSearchTitle: savedSearch.id && savedSearch.title,
        showExplanation: false
      });
    },

    titleConflict(opts) {
      return baseModal(titleConflictTemplate, opts);
    },

    progress(opts) {
      return baseModal(progressTemplate, opts);
    }
  };
}
