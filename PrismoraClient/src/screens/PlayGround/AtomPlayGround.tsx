// HomeScreen.js
import { useState } from 'react';
import { SafeAreaView, ScrollView, View, Text, StyleSheet } from 'react-native';
import { Typography } from '../../components/atoms/Typography';
import { useTheme } from '../../hooks/useTheme';
import { Button } from '../../components/atoms/Button';
import { Card } from '../../components/atoms/Card';
import { Input } from '../../components/atoms/Input';
import { Loader } from '../../components/atoms/Loader';
import { Avatar } from '../../components/atoms/Avatar';
import { BackgroundImage } from '../../components/atoms/BackgroundImage';
import { Badge } from '../../components/atoms/Badge';
import { Checkbox } from '../../components/atoms/Checkbox';
import { Divider } from '../../components/atoms/Divider';
import { IconButton } from '../../components/atoms/IconButton';
import { Link } from '../../components/atoms/Link';
import { Skeleton } from '../../components/atoms/Skeleton';
import { Toggle } from '../../components/atoms/Switch';
import { HelperText } from '../../components/atoms/Tooltip';

const AtomPlayGround = ({ navigation }) => {
  const { colors, spacing } = useTheme();
  const [checked, setChecked] = useState(false);
  const [toggled, setToggled] = useState(false);
  const [loadingButton, setLoadingButton] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const placeholderImage = {
    uri: 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  };
  const placeholderImage2 = {
    uri: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSHQwsTBtGEHUqPW2hTTeX57otZ-2Ics8Vtwg&s',
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.container}>
        <Typography variant="h2">Component Playground</Typography>
        <Typography variant="body" style={{ marginBottom: spacing.md }}>
          Use this screen to test and visually inspect all atoms/components.
        </Typography>

        {/* Avatar */}
        <Section title="Avatar">
          <View style={styles.row}>
            <Avatar source={placeholderImage} size={60} />
            <View style={{ width: spacing.md }} />
            <Avatar source={placeholderImage} size={40} />
          </View>
        </Section>

        {/* Background Image (with overlay content) */}
        <Section title="BackgroundImage">
          <BackgroundImage source={placeholderImage2} style={styles.bgImage}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Background</Text>
          </BackgroundImage>
        </Section>

        {/* Badge */}
        <Section title="Badge">
          <View style={styles.row}>
            <Badge text="success" variant="success" />
            <View style={{ width: spacing.sm }} />
            <Badge text="warning" variant="warning" />
            <View style={{ width: spacing.sm }} />
            <Badge text="error" variant="error" />
          </View>
        </Section>

        {/* Buttons */}
        <Section title="Buttons">
          <View style={styles.row}>
            <Button
              title="Primary"
              onPress={() => console.log('Primary pressed')}
            />
            <View style={{ width: spacing.md }} />
            <Button
              variant="secondary"
              title="Secondary"
              onPress={() => console.log('Secondary pressed')}
            />
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <Button
              title="Loading"
              loading={loadingButton}
              onPress={() => {
                setLoadingButton(true);
                setTimeout(() => setLoadingButton(false), 1200);
              }}
            />
          </View>
        </Section>

        {/* Card */}
        <Section title="Card">
          <Card style={{ width: '100%' }}>
            <Typography variant="h3">Card title</Typography>
            <Typography variant="body">
              Card content: this is a preview of the card component.
            </Typography>
            <View style={{ height: spacing.md }} />
            <Button
              title="Card Action"
              onPress={() => console.log('card action')}
            />
          </Card>
        </Section>

        {/* Checkbox */}
        <Section title="Checkbox">
          <View style={styles.row}>
            <Checkbox checked={checked} onPress={() => setChecked(!checked)} />
            <View style={{ width: spacing.md }} />
            <Typography>Checked: {checked ? 'true' : 'false'}</Typography>
          </View>
        </Section>

        {/* Divider */}
        <Section title="Divider">
          <Typography>Above</Typography>
          <Divider marginVertical={8} />
          <Typography>Below</Typography>
        </Section>

        {/* IconButton */}
        <Section title="IconButton">
          <View style={styles.row}>
            <IconButton name="favorite" onPress={() => console.log('fav')} />
            <View style={{ width: spacing.md }} />
            <IconButton name="share" onPress={() => console.log('share')} />
          </View>
        </Section>

        {/* Input */}
        <Section title="Input">
          <Input
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Type something..."
          />
          <HelperText text="This is a helper text" />
        </Section>

        {/* Link */}
        <Section title="Link">
          <Link text="Open docs" onPress={() => console.log('open docs')} />
        </Section>

        {/* Loader */}
        <Section title="Loader">
          <Loader />
        </Section>

        {/* Skeleton */}
        <Section title="Skeleton">
          <Skeleton width={200} height={20} />
          <View style={{ height: spacing.sm }} />
          <Skeleton width="60%" height={12} />
        </Section>

        {/* Toggle */}
        <Section title="Toggle">
          <View style={styles.row}>
            <Toggle value={toggled} onValueChange={v => setToggled(v)} />
            <View style={{ width: spacing.md }} />
            <Typography>On: {toggled ? 'Yes' : 'No'}</Typography>
          </View>
        </Section>

        {/* Helper Text */}
        <Section title="HelperText">
          <HelperText text="All good" />
          <View style={{ height: spacing.sm }} />
          <HelperText text="Error example" error />
        </Section>

        {/* Final spacing */}
        <View style={{ height: 48 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const Section = ({ children, title }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: '700',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bgImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AtomPlayGround;
