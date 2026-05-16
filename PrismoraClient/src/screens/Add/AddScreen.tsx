// screens/Add/AddScreen.tsx
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AddStackParamList } from '../../navigation/stacks/AddStack';

type AddScreenNavigationProp = NativeStackNavigationProp<AddStackParamList, 'AddScreen'>;

interface AddScreenProps {
  navigation: AddScreenNavigationProp;
}

const AddScreen = ({ navigation }: AddScreenProps) => {
  useEffect(() => {
    // Automatically navigate to CreatePostUploadOptions when Add tab is pressed
    navigation.navigate('CreatePostUploadOptions');
  }, []);

  return <View />;
};

export default AddScreen;