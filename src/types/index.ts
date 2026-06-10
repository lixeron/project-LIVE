export interface PreloaderState {
  progress: number;
  itemsLoaded: number;
  itemsTotal: number;
  hardwareWarmed: boolean;
  isCompleted: boolean;
}

export interface MasterSceneControllerProps {
  scrollProgress: number;
  onWarmed: () => void;
}

export interface SceneComponentProps {
  active: boolean;
}
