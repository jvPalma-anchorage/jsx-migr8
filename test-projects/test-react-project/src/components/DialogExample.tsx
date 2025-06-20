import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button as MuiButton } from '@mui/material';
import { Modal, Button as AntButton } from 'antd';
import { 
  Modal as ChakraModal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button as ChakraButton,
  useDisclosure
} from '@chakra-ui/react';

export const DialogExample: React.FC = () => {
  const [muiOpen, setMuiOpen] = useState(false);
  const [antOpen, setAntOpen] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <div>
      <h2>Material-UI Dialog</h2>
      <MuiButton variant="outlined" onClick={() => setMuiOpen(true)}>
        Open MUI Dialog
      </MuiButton>
      <Dialog open={muiOpen} onClose={() => setMuiOpen(false)}>
        <DialogTitle>MUI Dialog Title</DialogTitle>
        <DialogContent>
          This is a Material-UI dialog with some content.
        </DialogContent>
        <DialogActions>
          <MuiButton onClick={() => setMuiOpen(false)}>Cancel</MuiButton>
          <MuiButton onClick={() => setMuiOpen(false)}>Confirm</MuiButton>
        </DialogActions>
      </Dialog>
      
      <h2>Ant Design Modal</h2>
      <AntButton type="primary" onClick={() => setAntOpen(true)}>
        Open Ant Modal
      </AntButton>
      <Modal
        title="Ant Design Modal"
        open={antOpen}
        onOk={() => setAntOpen(false)}
        onCancel={() => setAntOpen(false)}
      >
        <p>Some contents...</p>
        <p>Some contents...</p>
        <p>Some contents...</p>
      </Modal>
      
      <h2>Chakra UI Modal</h2>
      <ChakraButton onClick={onOpen}>Open Chakra Modal</ChakraButton>
      <ChakraModal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Chakra Modal Title</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            This is a Chakra UI modal with some content.
          </ModalBody>
          <ModalFooter>
            <ChakraButton colorScheme="blue" mr={3} onClick={onClose}>
              Close
            </ChakraButton>
            <ChakraButton variant="ghost">Secondary Action</ChakraButton>
          </ModalFooter>
        </ModalContent>
      </ChakraModal>
    </div>
  );
};