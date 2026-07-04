import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AuthInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  error?: string;
  isPassword?: boolean;
}

const AuthInput: React.FC<AuthInputProps> = ({
  label,
  icon,
  error,
  isPassword = false,
  ...rest
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          focused && styles.inputRowFocused,
          !!error && styles.inputRowError,
        ]}
      >
        <Ionicons
          name={icon}
          size={18}
          color={error ? '#ff4d4d' : focused ? '#e50914' : '#555'}
          style={styles.iconLeft}
        />
        <TextInput
          {...rest}
          style={styles.input}
          placeholderTextColor="#444"
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          autoCapitalize={isPassword ? 'none' : rest.autoCapitalize}
          autoCorrect={false}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#555"
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0d1130',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2a2a3e',
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowFocused: { borderColor: '#e50914' },
  inputRowError: { borderColor: '#ff4d4d' },
  iconLeft: { marginRight: 10 },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    height: '100%',
  },
  error: {
    fontSize: 12,
    color: '#ff4d4d',
    marginTop: 4,
    marginLeft: 2,
  },
});

export default AuthInput;
