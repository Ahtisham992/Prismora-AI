/* eslint-disable react-native/no-inline-styles */
// HomeScreen.js
import { Image, View, StyleSheet } from 'react-native';
import { Button } from '../../components/atoms/Button';
import { Link } from '../../components/atoms/Link';
import { Screen } from '../../components/layout/Screen';
import { VStack } from '../../components/layout/VStack';
import { Typography } from '../../components/atoms/Typography';
import Onboarding1 from "../../assets/images/Onboarding1.png";
import { useTheme } from '../../hooks/useTheme';

const Onboarding1Screen = ({ navigation }) => {
  const { colors, spacing, typography } = useTheme();

  const totalScreens = 3;
  const currentScreen = 0; // 0-indexed for first screen

  return (
    <Screen>
      <VStack
        style={{ flex: 1, justifyContent: 'space-between', marginVertical: spacing.xl }}
      >
        {/* Top section */}
        <Link
          text='Skip'
          color={colors.text}
          style={{  alignSelf: "flex-end",marginRight:spacing.lg,fontFamily:typography.families.poppins.light }}
          onPress={() => navigation.navigate('AuthStack')}
        />

        {/* Image section */}
        <View style={{ alignItems: 'center' }}>
          <Image
            source={Onboarding1}
            style={{
              width: '90%',
              height: 200,
              resizeMode: 'contain',
            }}
          />
        </View>

        {/* Headline */}
          <Typography
            size="xl"
            family={typography.families.poppins.light}
            style={{ textAlign: 'center' }}
            color={colors.text}
          >
            Turn Long Podcasts into Smart Summaries.
          </Typography>

          {/* Pagination dots */}
          <View style={styles.dotsContainer}>
            {Array.from({ length: totalScreens }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor:
                      index === currentScreen ? colors.primary : '#C4C4C4',
                  },
                ]}
              />
            ))}
          </View>
 

        {/* Next button */}
        <Button
          variant='primary'
          title="Next"
          onPress={() => navigation.navigate('Onboarding2')}
        />
      </VStack>
    </Screen>
  );
};

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
});

export default Onboarding1Screen;
