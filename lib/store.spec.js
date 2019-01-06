describe('store', () => {

  describe('getStore', () => {
  
    it('returns a convience object with the redis connection partially applied');
  
  });

  describe('set', () => {
  
    it('sets a value at key');
  
  });

  describe('get', () => {
  
    context('when a key is specified', () => {
    
      it('the value at the key is returned');
    
    });

    context('when no key is specified', () => {
    
      it('all values are returned');
    
    });
  
  });

  describe('clear', () => {
  
    it('removed all values from the store');
  
  });

});