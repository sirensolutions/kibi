import createTemplate from './create_modal.html';
import titleConflictTemplate from './title_conflict_modal.html';
import progressTemplate from './progress_modal.html';

import './create_modal.less';

import { BaseModalProvider } from './base_modal';

import _ from 'lodash';


export function QuickDashModalsProvider(Private) {
  const baseModal = Private(BaseModalProvider);

  return {
    create({ title, currSearchTitle, toUniqueSearchTitle }) {
      toUniqueSearchTitle = _.memoize(toUniqueSearchTitle);

      let lastToken = 0;

      let updateNewSearchTitle = function updateNewSearchTitle() {
        const currToken = ++lastToken;

        toUniqueSearchTitle(this.result.title)
          .then(newSearchTitle => {
            if(currToken !== lastToken) { return; }

            this.loading = false;
            this.result.newSavedSearchTitle = newSearchTitle;
          });
      };

      function onTitleChange() {
        this.loading = true;
        updateNewSearchTitle.call(this);
      }

      const modal = baseModal(createTemplate, {
        result: {
          title,
          newSavedSearchTitle: '',
          savedSearchAction: 'new',
          storeTimeWithDashboard: true
        },

        currSearchTitle,
        onTitleChange,
        loading: false
      });

      modal.scope.onTitleChange();
      updateNewSearchTitle = _.debounce(updateNewSearchTitle, 200);

      return modal;
    },

    titleConflict(opts) {
      return baseModal(titleConflictTemplate, opts);
    },

    progress(opts) {
      return baseModal(progressTemplate, opts);
    }
  };
}
