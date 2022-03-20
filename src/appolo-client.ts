import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const authLink = setContext((_, { headers }) => {
  return {
    headers: {
      ...headers,
      Authorization: 'bearer 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',
    },
  };
});

const client = new ApolloClient({
  link: authLink.concat(new HttpLink({ uri: 'https://api.github.com/graphql' })),
  cache: new InMemoryCache(),
});

export default client;
