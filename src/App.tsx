import { IonApp, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Route } from 'react-router-dom'
import CollectionPage from './pages/CollectionPage'

setupIonicReact()

const App = () => (
  <IonApp>
    <IonReactRouter>
      <IonRouterOutlet>
        <Route exact path="/" component={CollectionPage} />
      </IonRouterOutlet>
    </IonReactRouter>
  </IonApp>
)

export default App
