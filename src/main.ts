import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import { createPinia } from 'pinia'

import { OhVueIcon, addIcons } from "oh-vue-icons";
import {
  MdHome,
  MdHomeOutlined,
  MdLibrarymusic,
  MdLibrarymusicOutlined,
  MdSettings,
  MdSettingsOutlined,
  MdAlbum,
  MdCalendarmonth,
  MdHighquality,
  MdPlayarrow,
  MdDownload,
  MdCheck,
  MdCheckcircle,
  MdTimelapse,
  HiDotsVertical,
  // New icons for the overlay
  MdFavorite,
  MdFavoriteborder,
  MdShare,
  MdPlaylistadd,
  MdVisibilityoff,
  MdQueuemusic,
  MdPerson,
  MdHeadphones,
  MdRadio,
  MdAdd,
  FaEdit,
  MdDeleteOutlined,
  MdPause,
  MdRefresh,
  FaChevronDown,
  IoEllipsisHorizontalSharp,
  BiShuffle,
  MdSkippreviousRound,
  MdSkipnextRound,
  MdRepeatone,
  MdRepeat,
  MdVolumeoff, MdVolumeup, MdList
} from "oh-vue-icons/icons";

addIcons(
    MdHome, MdHomeOutlined, MdLibrarymusic, MdSettings, MdSettingsOutlined, MdLibrarymusicOutlined,
    MdAlbum,
    MdCalendarmonth,
    MdHighquality,
    MdPlayarrow,
    MdDownload,
    MdCheck,
    MdCheckcircle,
    MdTimelapse,
    HiDotsVertical,
    // New icons for the overlay
    MdFavorite,
    MdFavoriteborder,
    MdShare,
    MdPlaylistadd,
    MdVisibilityoff,
    MdQueuemusic,
    MdPerson,
    MdHeadphones,
    MdRadio,
    MdAdd,
    FaEdit,
    MdDeleteOutlined,
    MdPause,
    MdRefresh,
    FaChevronDown,
    IoEllipsisHorizontalSharp,
    BiShuffle,
    MdSkippreviousRound,
    MdSkipnextRound,
    MdRepeatone,
    MdRepeat,
    MdVolumeoff,
    MdVolumeup,
    MdList
);

import './main.css'

import { IonicVue } from '@ionic/vue';

/* Core CSS required for Ionic components to work properly */
// import '@ionic/vue/css/core.css';

/* Basic CSS for apps built with Ionic
import '@ionic/vue/css/normalize.css';
import '@ionic/vue/css/structure.css';
import '@ionic/vue/css/typography.css'; */

/* Optional CSS utils that can be commented out */
// import '@ionic/vue/css/padding.css';
// import '@ionic/vue/css/float-elements.css';
// import '@ionic/vue/css/text-alignment.css';
// import '@ionic/vue/css/text-transformation.css';
// import '@ionic/vue/css/flex-utils.css';
// import '@ionic/vue/css/display.css';

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * For more info, please see:
 * https://ionicframework.com/docs/theming/dark-mode
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
import '@ionic/vue/css/palettes/dark.system.css';

/* Theme variables */
import './theme/variables.css';

const app = createApp(App)
  .use(IonicVue)
  .use(router)
  .use(createPinia());

app.component("v-icon", OhVueIcon);

router.isReady().then(() => {
  app.mount('#app');
});
