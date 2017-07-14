import UiModules from 'ui/modules';
import EventsProvider from 'ui/events';

UiModules.get('kibana')
.service('sirenSession', ($location, Private) => {
  const Events = Private(EventsProvider);

  class SirenSession extends Events {
    constructor() {
      super();
      this.dataString = '{}';
    }
    getData() {
      if (this.dataString) {
        return JSON.parse(this.dataString);
      }
      return {};
    }

    getDataString() {
      return this.dataString;
    }

    putData(data, initial) {
      // storing locally so I can watch it
      this.dataString = JSON.stringify(data);
      if (initial) {
        this.emit('kibisession:loaded');
      } else {
        this.emit('kibisession:changed');
      }
    }
  }

  return new SirenSession();
});
