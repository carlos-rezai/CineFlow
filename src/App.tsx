import {
  IonApp,
  IonIcon,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { filmOutline, tvOutline } from 'ionicons/icons'
import { Redirect, Route } from 'react-router-dom'
import CollectionPage from './pages/CollectionPage'
import DiscDetailPage from './pages/DiscDetailPage'
import WatchPage from './pages/WatchPage'
import { CollectionRefreshProvider } from './context/CollectionRefreshContext'

setupIonicReact()

const App = () => (
  <IonApp>
    <CollectionRefreshProvider>
      <IonReactRouter>
        <IonTabs>
          <IonRouterOutlet>
            <Route exact path="/collection" component={CollectionPage} />
            <Route path="/disc/:id" component={DiscDetailPage} />
            <Route exact path="/watch" component={WatchPage} />
            <Route
              exact
              path="/"
              render={() => <Redirect to="/collection" />}
            />
          </IonRouterOutlet>
          <IonTabBar slot="bottom">
            <IonTabButton tab="collection" href="/collection">
              <IonIcon icon={filmOutline} />
              <IonLabel>Collection</IonLabel>
            </IonTabButton>
            <IonTabButton tab="watch" href="/watch">
              <IonIcon icon={tvOutline} />
              <IonLabel>Watch</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </CollectionRefreshProvider>
  </IonApp>
)

export default App
