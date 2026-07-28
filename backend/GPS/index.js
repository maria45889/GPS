import {AppRegistry} from 'react-native';
import BackgroundService from 'react-native-background-actions';
import App from './App';
import {name as appName} from './app.json';
import {trackingTask} from './src/tracker';

// Headless task: Android mata el proceso pero el sistema lo reinicia
// automáticamente. Este handler permite que el rastreo continúe incluso
// si el usuario fuerza el cierre de la app.
BackgroundService.on('task', trackingTask);

AppRegistry.registerComponent(appName, () => App);
