/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Image, View } from 'react-native';
import { Button } from '../../components/atoms/Button';
import { Link } from '../../components/atoms/Link';
import { Screen } from '../../components/layout/Screen';
import { VStack } from '../../components/layout/VStack';
import { Typography } from '../../components/atoms/Typography';
import Onboarding3 from "../../assets/images/Onboarding3.png";
import { useTheme } from '../../hooks/useTheme';
import { IconButton } from '../../components/atoms/IconButton';

const Onboarding3Screen = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();
  const totalScreens = 3;
  const currentScreen = 2;

  return (
    <Screen>
      <VStack style={{ flex: 1, justifyContent: 'space-between', marginVertical: spacing.xxl }}>

        {/* Top Row: Back + Skip */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
        </View>

        {/* Image */}
        <View style={{ alignItems: 'center' }}>
          <Image
            source={Onboarding3}
            style={{ width: '90%', height: 200, resizeMode: 'contain' }}
          />
        </View>

        {/* Headline */}
        <Typography
          size="xl"
          family={typography.families.poppins.light}
          style={{ textAlign: 'center' }}
          color={colors.text}
        >
          Follow every word with timestamped transcriptions and detailed summaries.
        </Typography>

        {/* Pagination Dots */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
          {Array.from({ length: totalScreens }).map((_, index) => (
            <View
              key={index}
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                marginHorizontal: 4,
                backgroundColor: index === currentScreen ? colors.primary : '#C4C4C4',
              }}
            />
          ))}
        </View>

        {/* Next Button */}
        <Button
          variant="primary"
          title="Let's Get Started!"
          onPress={() => navigation.navigate('AuthStack')}
        />
      </VStack>
    </Screen>
  );
};

export default Onboarding3Screen;
