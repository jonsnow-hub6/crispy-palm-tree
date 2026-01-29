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
    // Subscribe to project updates
    const unsubscribe = pb.collection('projects').subscribe('*', (e) => {
      // Handle real-time updates if packet data is added to schema
      console.log('Project update:', e);
    });

    // Poll for packet validation status
    // Since we can't store packet data in schema, we'll need to poll the API
    const interval = setInterval(async () => {
      // This would call an endpoint that returns current packet status
      // For now, we'll skip this until schema is updated
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [dispatch, projects, activePresetId]);
}
