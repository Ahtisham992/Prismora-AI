/* eslint-disable react-native/no-inline-styles */
import React from 'react';
import { Image, View } from 'react-native';
import { Button } from '../../components/atoms/Button';
import { Link } from '../../components/atoms/Link';
import { Screen } from '../../components/layout/Screen';
import { VStack } from '../../components/layout/VStack';
import { Typography } from '../../components/atoms/Typography';
import Onboarding2 from '../../assets/images/Onboarding2.png';
import { useTheme } from '../../hooks/useTheme';
import { IconButton } from '../../components/atoms/IconButton';

const Onboarding2Screen = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();
  const totalScreens = 3;
  const currentScreen = 1;

  return (
    <Screen>
      <VStack style={{ flex: 1, justifyContent: 'space-between', marginVertical: spacing.xl }}>

        {/* Top Row: Back + Skip */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <IconButton name="arrow-back" onPress={() => navigation.goBack()} />
          <Link
            text="Skip"
            color={colors.text}
            style={{
              fontFamily: typography.families.poppins.light,
              marginRight: spacing.lg,
            }}
            onPress={() => navigation.navigate('AuthStack')}
          />
        </View>

        {/* Image */}
        <View style={{ alignItems: 'center' }}>
          <Image
            source={Onboarding2}
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
          Skip the noise, jump straight to highlights and short reels.
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
          title="Next"
          onPress={() => navigation.navigate('Onboarding3')}
        />
      </VStack>
    </Screen>
  );
};

export default Onboarding2Screen;
