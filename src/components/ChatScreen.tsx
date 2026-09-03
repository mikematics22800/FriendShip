import React, { useEffect, useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import firestore from '@react-native-firebase/firestore';

export default function ChatScreen() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Real-time listener on the "messages" collection
    const unsubscribe = firestore()
      .collection('messages')
      .orderBy('timestamp', 'desc')
      .onSnapshot(querySnapshot => {
        const list: any[] = [];
        querySnapshot.forEach(doc => {
          list.push({
            id: doc.id,
            ...doc.data(),
          });
        });
        setMessages(list);
      });

    return () => unsubscribe();
  }, []);

  // Function to create a message
  const sendMessage = async () => {
    await firestore().collection('messages').add({
      text: 'Hello from Expo!',
      senderId: 'user_123',
      timestamp: firestore.FieldValue.serverTimestamp(),
    });
  };

  return (
    <View style={{ flex: 1, padding: 40 }}>
      <Button title="Send Test Message" onPress={sendMessage} />
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Text style={{ padding: 10 }}>{item.text}</Text>
        )}
      />
    </View>
  );
}