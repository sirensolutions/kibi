import createTemplate from './create_modal.html';
import titleConflictTemplate from './title_conflict_modal.html';
import generateReportTemplate from './generate_report.html';
import guessReportTemplate from './guess_report.html';

import './create_modal.less';
import './report.less';
import './quickdash_report.less';

import 'ui/kibi/directives/tristate_checkbox';
import 'ui/kibi/directives/sort_icon';
import 'ui/kibi/styles/table_sticky.less';

import { BaseModalProvider } from 'ui/kibi/modals/base_modal';

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
          storeTimeWithDashboard: true,
          addSirenMultiChart: false
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

    generateReport(opts) {
      return baseModal(generateReportTemplate, opts);
    },

    guessReport(opts) {
      return baseModal(guessReportTemplate, opts);
    }
  };
}
