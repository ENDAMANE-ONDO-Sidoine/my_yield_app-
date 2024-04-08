// Import des modules et des composants nécessaires
import React, { useEffect, useReducer } from 'react';
import { Button, Col, Container, Form, Row, Table } from 'react-bootstrap';
import { API, graphqlOperation } from 'aws-amplify';
import { withAuthenticator } from 'aws-amplify-react';
import Amplify from 'aws-amplify';

// Import des fichiers de configuration et des requêtes GraphQL
import awsConfig from './aws-exports';
import { createRestaurant, deleteRestaurant } from './graphql/mutations'; // Remarquez le changement ici
import { listRestaurants } from './graphql/queries';
import { onCreateRestaurant } from './graphql/subscriptions';

// Configuration d'AWS Amplify
Amplify.configure(awsConfig);

// Définition des types pour les données de restaurant et l'état de l'application
type Restaurant = {
  id: string;
  name: string;
  description: string;
  city: string;
};

type AppState = {
  restaurants: Restaurant[];
  formData: Restaurant;
};

// Définition des types pour les actions et les événements de souscription
type Action =
  | {
      type: 'QUERY';
      payload: Restaurant[];
    }
  | {
      type: 'SUBSCRIPTION';
      payload: Restaurant;
    }
  | {
      type: 'SET_FORM_DATA';
      payload: { [field: string]: string };
    };

type SubscriptionEvent<D> = {
  value: {
    data: D;
  };
};

// État initial de l'application
const initialState: AppState = {
  restaurants: [],
  formData: {
    id: '',
    name: '',
    city: '',
    description: '',
  },
};

// Réducteur pour gérer les actions et mettre à jour l'état de l'application
const reducer = (state: AppState, action: Action) => {
  switch (action.type) {
    case 'QUERY':
      return { ...state, restaurants: action.payload };
    case 'SUBSCRIPTION':
      return { ...state, restaurants: [...state.restaurants, action.payload] };
    case 'SET_FORM_DATA':
      return { ...state, formData: { ...state.formData, ...action.payload } };
    default:
      return state;
  }
};

// Composant principal de l'application
const App: React.FC = () => {
  // Fonction pour créer un nouveau restaurant
  const createNewRestaurant = async (e: React.SyntheticEvent) => {
    e.stopPropagation();
    try {
      const { name, description, city } = state.formData;
      const restaurant = { name, description, city };
      await API.graphql(graphqlOperation(createRestaurant, { input: restaurant }));
      // Réinitialisation du formulaire après la création du restaurant
      dispatch({ type: 'SET_FORM_DATA', payload: initialState.formData });
    } catch (error) {
      console.error('Erreur lors de la création du restaurant :', error);
      // Afficher un message d'erreur à l'utilisateur
    }
  };

  // Utilisation du hook useReducer pour gérer l'état de l'application
  const [state, dispatch] = useReducer(reducer, initialState);

  // Effet pour récupérer la liste des restaurants au chargement de l'application
  useEffect(() => {
    getRestaurantList();
    // Abonnement à l'événement de création de restaurant
    const subscription = API.graphql(graphqlOperation(onCreateRestaurant)).subscribe({
      next: (eventData: SubscriptionEvent<{ onCreateRestaurant: Restaurant }>) => {
        const payload = eventData.value.data.onCreateRestaurant;
        dispatch({ type: 'SUBSCRIPTION', payload });
      },
    });
    // Nettoyage de l'abonnement lors du démontage du composant
    return () => subscription.unsubscribe();
  }, []);

  // Fonction pour récupérer la liste des restaurants depuis l'API GraphQL
  const getRestaurantList = async () => {
    try {
      const restaurants = await API.graphql(graphqlOperation(listRestaurants));
      dispatch({ type: 'QUERY', payload: restaurants.data.listRestaurants.items });
    } catch (error) {
      console.error('Erreur lors de la récupération de la liste des restaurants :', error);
      // Afficher un message d'erreur à l'utilisateur
    }
  };

  // Fonction pour gérer les changements dans les champs du formulaire
  const handleChange = (e: any) =>
    dispatch({ type: 'SET_FORM_DATA', payload: { [e.target.name]: e.target.value } });

  // Fonction pour supprimer un restaurant
  const deleteRestaurantById = async (id: string) => { // Remarquez le changement ici
    try {
      await API.graphql(graphqlOperation(deleteRestaurant, { input: { id } })); // Remarquez le changement ici
    } catch (error) {
      console.error('Erreur lors de la suppression du restaurant :', error);
      // Afficher un message d'erreur à l'utilisateur
    }
  };

   // Rendu du composant
   return (
    <div className="App">
      <Container>
        <Row className="mt-3">
          <Col md={4}>
            <Form>
              <Form.Group controlId="formDataName">
                <Form.Control onChange={handleChange} type="text" name="name" placeholder="Name" />
              </Form.Group>
              <Form.Group controlId="formDataDescription">
                <Form.Control
                  onChange={handleChange}
                  type="text"
                  name="description"
                  placeholder="Description"
                />
              </Form.Group>
              <Form.Group controlId="formDataCity">
                <Form.Control
                  onChange={handleChange}
                  type="text"
                  name="city"
                  placeholder="City"
                />
              </Form.Group>
              <Button onClick={createNewRestaurant} className="float-left">
                Add New Restaurant
              </Button>
            </Form>
          </Col>
        </Row>

        {state.restaurants.length ? (
          <Row className="my-4">
            <Col className="bg-white t p-0 rounded-">
              <Table striped bordered hover>
                <thead>
                  <tr className="text-center">
                  <th>🔑ID</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>City</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {state.restaurants.map((restaurant, index) => (
                  <tr key={`restaurant-${index}`}  className="text-center">
                    <td>{index + 1}</td>
                    <td>{restaurant.name}</td>
                    <td>{restaurant.description}</td>
                    <td>{restaurant.city}</td>
                    <td>
                      <Button onClick={() => deleteRestaurantById(restaurant.id)}> 
                        Delete Restaurant
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Col>
        </Row>
      ) : null}
    </Container>
  </div>
);
};

// Utilisation de withAuthenticator pour ajouter une authentification à l'application
export default withAuthenticator(App);
