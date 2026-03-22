import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route } from 'react-router-dom'
import CollectionPage from './pages/CollectionPage'
import DiscDetailPage from './pages/DiscDetailPage'
import { CollectionRefreshProvider } from './context/CollectionRefreshContext'

setupIonicReact()

const App = () => (
  <IonApp>
    <CollectionRefreshProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/" component={CollectionPage} />
          <Route path="/disc/:id" component={DiscDetailPage} />
        </IonRouterOutlet>
      </IonReactRouter>
    </CollectionRefreshProvider>
  </IonApp>
)

export default App
