import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route } from 'react-router-dom'
import CollectionPage from './pages/CollectionPage'
import DiscDetailPage from './pages/DiscDetailPage'

setupIonicReact()

const App = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/" component={CollectionPage} />
        <Route path="/disc/:id" component={DiscDetailPage} />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
)

export default App
