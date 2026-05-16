import { View, StyleSheet } from "react-native";
import { Typography } from "../atoms/Typography";
import { useTheme } from "../../hooks/useTheme";

export const Header = ({ title }: { title: string }) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Typography size="xl" family="poppins.semiBold" color={colors.text}>
        {title}
      </Typography>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    zIndex: 10,
  },
});