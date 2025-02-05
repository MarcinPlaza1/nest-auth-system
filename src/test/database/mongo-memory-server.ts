import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer: MongoMemoryServer;

export const getMongoMemoryServer = async (): Promise<string> => {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
  }
  return mongoServer.getUri();
};

export const closeMongoMemoryServer = async (): Promise<void> => {
  if (mongoServer) {
    await mongoServer.stop();
  }
}; 