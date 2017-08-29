import { uiModules } from 'ui/modules';
import saveTemplate from './save.html';
import saveController from './save';
import openTemplate from './open.html';
import openController from './open';
import style from '../styles/saved_objects_api.less';

uiModules
.get('kibana')
.service('savedObjectsAPIModals', function ($modal) {

  /**
   * Exposes methods to show modal dialogs to save and open saved objects.
   */
  class ModalService {
    constructor() {
    }

    /**
     * Displays a modal to save the specified @savedObject .
     *
     * @param {Object} savedObjectService - The service that managed saved objects for the type of the specified @savedObject.
     * @param {SavedObject} savedObject - The saved object to save.
     */
    save(savedObjectService, savedObject) {

      const modalInstance = $modal.open({
        animation: false,
        template: saveTemplate,
        controller: 'SavedObjectsAPIModalSaveController',
        resolve: {
          savedObjectService: () => savedObjectService,
          savedObject: () => savedObject
        }
      });

      return modalInstance.result;
    }

    /**
     * Displays a modal to open a saved object.
     *
     * @param {Object} savedObjectService - A saved object service.
     */
    open(savedObjectService) {

      const modalInstance = $modal.open({
        animation: false,
        template: openTemplate,
        controller: 'SavedObjectsAPIModalOpenController',
        resolve: {
          savedObjectService: () => savedObjectService,
        }
      });

      return modalInstance.result;
    }
  }

  return new ModalService();
});
