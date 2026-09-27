/**
 * Re-export of ProductContext and useProducts from StoreContext
 * for unified and backwards-compatible store/product access.
 */
export {
  ProductContext,
  useProducts,
  StoreContext,
  useStore,
  StoreProvider,
} from './StoreContext';

export type {
  StoreContextType,
  SyncStatus
} from './StoreContext';
