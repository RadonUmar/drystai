import { MongoClient, Db, Collection } from 'mongodb';

const options = {};

let clientPromise: Promise<MongoClient> | null = null;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  if (!process.env.MONGODB_URI) {
    throw new Error('Please add your Mongo URI to .env.local');
  }

  if (clientPromise) {
    return clientPromise;
  }

  const uri: string = process.env.MONGODB_URI;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable to preserve the client across module reloads
    if (!global._mongoClientPromise) {
      const client = new MongoClient(uri, options);
      global._mongoClientPromise = client.connect();
    }
    clientPromise = global._mongoClientPromise;
  } else {
    // In production mode, create a new client for each request
    const client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }

  return clientPromise;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClientPromise();
  return client.db('dryst_db');
}

export async function getPeopleCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('people');
}

export async function getConversationsCollection(): Promise<Collection> {
  const db = await getDatabase();
  return db.collection('conversations');
}

export default getClientPromise;
