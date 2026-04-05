import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store';
import { updatePacketData } from '@/store/slices/projectsSlice';
import { pb } from '@/lib/pocketbase';

// Hook to subscribe to packet updates via PocketBase real-time
export function usePacketValidation() {
  const dispatch = useDispatch<AppDispatch>();
  const { projects } = useSelector((state: RootState) => state.projects);
  const { activePresetId } = useSelector((state: RootState) => state.presets);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let isMounted = true;

    // Subscribe to project updates properly awaiting the promise
    pb.collection('projects').subscribe('*', (e) => {
      // Handle real-time updates if packet data is added to schema
      console.log('Project update:', e);
    }).then(fn => {
      if (isMounted) unsubscribe = fn;
      else fn(); // unsubscribe immediately if component already unmounted
    }).catch(console.error);

    // Poll for packet validation status
    // Since we can't store packet data in schema, we'll need to poll the API
    const interval = setInterval(async () => {
      // This would call an endpoint that returns current packet status
      // For now, we'll skip this until schema is updated
    }, 5000);

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, [dispatch, projects, activePresetId]);
}
