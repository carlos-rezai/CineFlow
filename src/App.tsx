import {
  IonApp,
  IonLabel,
  IonRouterOutlet,
  IonTabBar,
  IonTabButton,
  IonTabs,
  setupIonicReact,
} from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Redirect, Route } from 'react-router-dom'
import CollectionPage from './pages/CollectionPage'
import DiscDetailPage from './pages/DiscDetailPage'
import WatchPage from './pages/WatchPage'
import { CollectionRefreshProvider } from './context/CollectionRefreshContext'
import './App.css'

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
          <IonTabBar slot="bottom" className="app-tab-bar">
            <IonTabButton tab="collection" href="/collection">
              <span className="material-symbols-rounded tab-icon">
                movie_filter
              </span>
              <IonLabel>Collection</IonLabel>
            </IonTabButton>
            <IonTabButton tab="watch" href="/watch">
              <span className="material-symbols-rounded tab-icon">
                auto_awesome
              </span>
              <IonLabel>Watch</IonLabel>
            </IonTabButton>
          </IonTabBar>
        </IonTabs>
      </IonReactRouter>
    </CollectionRefreshProvider>
  </IonApp>
)

export default App
