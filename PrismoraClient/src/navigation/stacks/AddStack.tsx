// navigation/stacks/AddStack.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AddScreen from '../../screens/Add/AddScreen';
import CreatePostUploadOptions from '../../screens/Add/CreatePostUploadOptions';
import CreatePostURL from '../../screens/Add/CreatePostURL';
import CreatePostFile from '../../screens/Add/CreatePostFile';
import CreatePostDescription from '../../screens/Add/CreatePostDescription';
import ProcessingScreen from '../../screens/Add/ProcessingScreen';
import ReviewScreen from '../../screens/Add/ReviewScreen';
import GeneratingScreen from '../../screens/Add/GeneratingScreen';
import EditPostScreen from '../../screens/Add/EditPostScreen';
import PostDetailsScreen from '../../screens/Add/PostDetailsScreen';
import UploadingScreen from '../../screens/Add/UploadingScreen';
import PreUploadScreen from '../../screens/Add/PreUploadScreen';

export interface ClipData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  thumbnailUrl: string;
  duration: string;
}

export interface ProcessedPodcastData {
  transcript: Array<{
    timestamp: string;
    text: string;
  }>;
  summary: string;
  clips: ClipData[];
  totalDuration: string;
}

export interface VideoData {
  id: string;
  url: string;
  thumbnailUrl: string;
  title: string;
  duration: string;
  // Edit options
  filter?: string;
  sound?: string;
  animation?: string;
  soundVolume?: number;
  trimStart?: number;
  trimEnd?: number;
}

export interface PostData {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  description: string;
  duration: number | string;
  podcastName?: string;
  episodeNumber?: string;
  hashtags: string[];
  visibility: string;
  filter?: string;
  sound?: string;
  animation?: string;
  soundVolume?: number;
  trimStart?: number;
  trimEnd?: number;
}

export type AddStackParamList = {
  AddScreen: undefined;
  CreatePostUploadOptions: undefined;
  CreatePostURL: undefined;
  CreatePostFile: undefined;
  CreatePostDescription: {
    source: 'url' | 'file';
    url?: string;
    file?: any;
  };
  ProcessingScreen: {
    podcastData: {
      title: string;
      description: string;
      tags: string[];
      category: string;
      duration: string;
      suggestion?: string;
      source: 'url' | 'file';
      url?: string;
      file?: any;
    };
  };
  ReviewScreen: {
    processedData: ProcessedPodcastData;
    podcastInfo: {
      title: string;
      description: string;
      thumbnailUrl: string;
    };
  };
  GeneratingScreen: {
    highlightResult?: any;
    selectedClips?: ClipData[];
    podcastInfo: {
      title: string;
      description: string;
      thumbnailUrl: string;
      url: string;
      duration: string;
    };
  };
  EditPostScreen: {
    videoData: VideoData;
  };
  PostDetailsScreen: {
    videoData: VideoData;
  };
  UploadingScreen: {
    postData: PostData;
  };
  PreUploadScreen:{
    postData: PostData;
  };
};

const Stack = createNativeStackNavigator<AddStackParamList>();

export default function AddStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AddScreen" component={AddScreen} />
      <Stack.Screen name="CreatePostUploadOptions" component={CreatePostUploadOptions} />
      <Stack.Screen name="CreatePostURL" component={CreatePostURL} />
      <Stack.Screen name="CreatePostFile" component={CreatePostFile} />
      <Stack.Screen name="CreatePostDescription" component={CreatePostDescription} />
      <Stack.Screen name="ProcessingScreen" component={ProcessingScreen} />
      <Stack.Screen name="ReviewScreen" component={ReviewScreen} />
      <Stack.Screen name="GeneratingScreen" component={GeneratingScreen} />
      <Stack.Screen name="EditPostScreen" component={EditPostScreen} />
      <Stack.Screen name="PostDetailsScreen" component={PostDetailsScreen} />
      <Stack.Screen name="PreUploadScreen" component={PreUploadScreen} />
      <Stack.Screen name="UploadingScreen" component={UploadingScreen} />
    </Stack.Navigator>
  );
}